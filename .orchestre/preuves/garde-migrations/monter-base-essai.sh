#!/bin/bash
# usage: build_db.sh <nom> [fichiers sql à appliquer après la base 0096..0121]
N=$1; shift
M=/home/user/presti/supabase/migrations
P="psql -h /tmp -p 54329 -U pgtest -q"
$P -d postgres -c "drop database if exists $N" -c "create database $N" >/dev/null 2>&1
$P -d $N >/dev/null 2>&1 <<'EOS'
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema if not exists extensions; create extension if not exists pgcrypto schema extensions;
create table public.artisans(id uuid primary key default gen_random_uuid(), is_founder boolean default false, email text);
EOS
for f in 0096_ops_socle 0097_ops_identite 0098_ops_taches 0099_ops_garde_envois 0105_acquisition_socle 0106_acquisition_echanges 0111_acquisition_envoi 0117_ops_demandes 0120_ops_horloge_codes_nuls 0121_plafond_avant_coup; do $P -d $N -f $M/$f.sql >/dev/null 2>&1; done
for f in "$@"; do $P -d $N -v ON_ERROR_STOP=1 -f $f 2>&1 | grep -v NOTICE | head -5; done
